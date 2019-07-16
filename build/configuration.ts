// tslint:disable: no-console
import * as path from "path";
import * as fs from "../src/common/fsExtra";
import * as assert from "assert";

const baseDir = path.resolve(__dirname, "..", "..");

async function readJSON(filepath: string): Promise<any> {
    const text = await fs.readFile(filepath, { encoding: "utf8" });
    return JSON.parse(text);
}

async function writeJSON(filepath: string, obj: any): Promise<void> {
    const text = JSON.stringify(obj, undefined, "\t");
    await fs.writeFile(filepath, text, { encoding: "utf8" });
}

async function main() {
    const schemaPath = path.resolve(baseDir, "log-viewer.schema.json");
    const packageJsonPath = path.resolve(baseDir, "package.json");

    const schema = new Schema(await readJSON(schemaPath));
    const configuration = schema.toConfig();

    const packageJson = await readJSON(packageJsonPath);
    packageJson.contributes.configuration = configuration;

    await writeJSON(packageJsonPath, packageJson);
}

function clone<T>(x: T): T {
    return JSON.parse(JSON.stringify(x));
}

function isObj(x: unknown): x is Record<string, unknown> {
    return x != null && typeof x === "object";
}

class Schema {
    constructor(private readonly schema: any) {
    }

    private getRef(ref: string) {
        const parts = ref.split("/");
        assert(parts[0], "#");
        let dest = this.schema;
        for (let i = 1; i < parts.length; i++) {
            dest = dest[parts[i]];
        }
        return clone(dest);
    }

    public resolve(type: unknown) {
        const MaxRecursion = 1;
        const iter = (obj: unknown, refsDepths: Record<string, number>): boolean => {
            if (!isObj(obj)) {
                return true;
            }

            if ("$ref" in obj) {
                const ref = obj.$ref as string;
                const refDepth = refsDepths[ref] || 0;
                if (refDepth > MaxRecursion) {
                    return false;
                }
                const def = this.getRef(ref);
                delete obj.$ref;

                const newObj = Object.assign({}, def, obj);
                Object.assign(obj, newObj);
                const newRefDefs = Object.assign({}, refsDepths);
                newRefDefs[ref] = refDepth + 1;
                return iter(obj, newRefDefs);
            } else {
                let resolved = true;
                for (const k of Object.keys(obj)) {
                    const prop = obj[k];
                    if (Array.isArray(prop)) {
                        const newVals: any[] = [];
                        obj[k] = newVals;
                        for (const x of prop) {
                            if (iter(x, refsDepths)) {
                                newVals.push(x);
                            } else {
                                console.log(`Dropping ${JSON.stringify(x)}`);
                            }
                        }
                    } else if (isObj(prop)) {
                        if (!iter(prop, refsDepths)) {
                            resolved = false;
                        }
                    }
                }
                return resolved;
            }
        };

        iter(type, {});
    }
    public toConfig() {
        const config = clone(this.schema);
        this.resolve(config.properties);
        delete config.definitions;
        delete config.$schema;
        return config;
    }
}

main();
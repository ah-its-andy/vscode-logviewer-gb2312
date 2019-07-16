import * as util from "util";
import * as fs from "fs";

export const read = util.promisify(fs.read);
export const readFile = util.promisify(fs.readFile);
export const writeFile = util.promisify(fs.writeFile);
export const stat = util.promisify(fs.stat);
export const exists = util.promisify(fs.exists);
export const open = util.promisify(fs.open);
export const close = util.promisify(fs.close);

export interface ReadResult {
    bytesRead: number;
    buffer: Buffer;
}

import { IConfigService } from "./config";
import { Logger } from "./logger";

interface Container {
    config: IConfigService;
    logger: Logger;
}

const container: Map<string, unknown> = new Map();

export function registerInstance<K extends keyof Container>(k: K, instance: Container[K]) {
    container.set(k, instance);
}

export function getInstace<K extends keyof Container>(k: K): Container[K] {
    const instance = container.get(k);
    if (instance == null) {
        throw new Error(`Missing registration for "${k}"`);
    }
    return instance as Container[K];
}
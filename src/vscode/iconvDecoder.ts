import * as iconv from "iconv-lite";
import { NodeStringDecoder, StringDecoder } from "string_decoder";

export class IConvDecoder implements NodeStringDecoder{
    private readonly _encodingStr : string;
    
    constructor(encodingStr : string){
        this._encodingStr =  encodingStr;
    }

    write(buffer: Buffer): string {
        return iconv.decode(buffer, this._encodingStr);
    }    
    
    end(buffer?: Buffer | undefined): string {
        if(buffer === undefined) return "";
        return this.write(buffer);
    }
}
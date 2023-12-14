import {LogLevel} from "./LogLevel";

export interface IRestLoggerOptions {
    environment: 'Development' | 'Staging' | 'Production',
    restLoggerUrl: string;
    batchLogIntervalInSeconds: number;
    timeoutInSeconds: number;
    minimumLevel: LogLevel | null | undefined;
    service: {
        name: string;
        version: string;
    };
}
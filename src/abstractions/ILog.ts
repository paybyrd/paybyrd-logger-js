import { LogLevel } from "./LogLevel";

export interface ILog {
    method: string;
    correlationId: string;
    level: LogLevel;
    message: string;
    content?: object | null | undefined;
    error?: Error | null | undefined;
    elapsedTimeInMilliseconds?: number | null | undefined;
}

import {ILog, ILogger, LogLevel} from "./abstractions";

export class ConsoleLogger implements ILogger {
    flush(): Promise<void> {
        return Promise.resolve();
    }

    log(log: ILog): void {
        switch (log.level) {
            case LogLevel.Trace:
                return console.trace(log);
            case LogLevel.Debug:
                return console.debug(log);
            case LogLevel.Warning:
                return console.warn(log);
            case LogLevel.Error:
            case LogLevel.Critical:
                return console.error(log);
            default:
                return console.log(log);
        }
    }
}
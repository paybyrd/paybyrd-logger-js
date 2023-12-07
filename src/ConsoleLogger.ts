import {ILog, ILogger, LogLevel} from "./abstractions";

export class ConsoleLogger implements ILogger {
    flush(): Promise<void> {
        return Promise.resolve();
    }

    log(log: ILog): void {
        const errorLog = {
            ...log,
            error: log.error?.toString()
        };

        switch (log.level) {
            case LogLevel.Trace:
                return console.trace(errorLog);
            case LogLevel.Debug:
                return console.debug(errorLog);
            case LogLevel.Warning:
                return console.warn(errorLog);
            case LogLevel.Error:
            case LogLevel.Critical:
                return console.error(errorLog);
            default:
                return console.log(errorLog);
        }
    }

}
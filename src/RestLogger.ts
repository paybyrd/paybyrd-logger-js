import {IRestLoggerOptions, ILog, ILogger, LogLevel} from "./abstractions";
import {ConsoleLogger} from "./ConsoleLogger";
import { v4 as uuidV4 } from "uuid";

interface IFullLog {
    service: {
        name: string;
        version: string
    },
    environment: 'Development' | 'Staging' | 'Production';
    executionDate: Date,
    entrypoint: string;
    method: string;
    correlationId: string;
    level: LogLevel;
    customMessage: string;
    message: string;
    content: object | null | undefined;
    exeption: IException | null | undefined;
    elapsedTimeInMilliseconds: number | null | undefined;
}

interface IException {
    className: string;
    stackTrace?: string;
    message: string;
}

export class RestLogger implements ILogger {
    private static readonly DEFAULT_BATCH_TIMEOUT = 5;
    private readonly _logger: ILogger;
    private readonly _options: IRestLoggerOptions;
    private _logs: Array<{ executionDate: Date, log: ILog }> = [];
    private _interval: NodeJS.Timer;

    constructor(options: IRestLoggerOptions,
                logger: ILogger = new ConsoleLogger()) {
        this._logger = logger;
        this._options = options;
        this._interval = setInterval(this.sendBatch.bind(this), (this._options.batchLogIntervalInSeconds || RestLogger.DEFAULT_BATCH_TIMEOUT) * 1000);
    }

    log(log: ILog): void {
        this._logger.log(log);

        if (!this._options.restLoggerUrl) {
            this._logger.log({
                message: 'RestLoggerUrl is not defined',
                content: log,
                method: 'log',
                correlationId: log.correlationId,
                level: LogLevel.Warning
            });
            return;
        }

        if (this._options.minimumLevel
            && log.level < this._options.minimumLevel) {
            return this._logger.log({
                message: 'Minimum level not achieved for sending',
                content: {
                    log,
                    minimumLevel: this._options.minimumLevel
                },
                method: 'log',
                correlationId: log.correlationId,
                level: LogLevel.Warning
            });
        }

        this._logs.unshift({
            executionDate: new Date(),
            log
        });
    }

    async flush(correlationId = uuidV4()): Promise<void> {
        clearInterval(this._interval);
        try
        {
            while (this._logs.length) {
                await this.sendBatch(correlationId);
            }
        }
        catch (error) {
            this._logger.log({
                error: error,
                message: 'Error sending messages to API',
                method: 'flush',
                correlationId,
                level: LogLevel.Error
            });
        } finally {
            this._interval = setInterval(this.sendBatch.bind(this), (this._options.batchLogIntervalInSeconds || RestLogger.DEFAULT_BATCH_TIMEOUT) * 1000);
        }
    }

    async sendBatch(correlationId = uuidV4()): Promise<void> {
        this._logger.log({
            message: `Start SendBatch`,
            method: 'sendBatch',
            correlationId: correlationId,
            level: LogLevel.Debug
        });

        const items = this._logs.splice(0, 10);
        if (!items.length) {
            return;
        }        
        try {
            const timeout = (this._options.timeoutInSeconds || 30) * 1000;
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), timeout);
            const fullItems = items.map(i => this.getFullLog(i));
            const request = {
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST',
                keepalive: true,
                body: JSON.stringify(fullItems),
                signal: abortController.signal
            };
            const url = new URL(this._options.restLoggerUrl);
            this._logger.log({
                message: `ExternalService - Request (${url.hostname})`,
                content: fullItems,
                method: 'sendBatch',
                correlationId: correlationId,
                level: LogLevel.Debug
            });
            const response = await fetch(this._options.restLoggerUrl, request);
            clearTimeout(timeoutId);
            this._logger.log({
                message: `ExternalService - Response (${url.hostname})`,
                method: 'sendBatch',
                correlationId: correlationId,
                level: LogLevel.Debug
            });

            if (!response.ok) {
                this._logger.log({
                    message: 'Error sending messages to API',
                    content: items,
                    method: 'sendBatch',
                    correlationId,
                    level: LogLevel.Error
                });
            }
        } catch (error) {
            this._logger.log({
                error: error,
                message: 'Error sending messages to API',
                content: items,
                method: 'sendBatch',
                correlationId,
                level: LogLevel.Error
            });
        }
    }

    private static getException(error: Error | null | undefined): IException | null {
        if (!error) {
            return null;
        }

        try {
            return {
                stackTrace: error.stack,
                message: error.message,
                className: error.name
            };
        } catch {
            return {
                message: JSON.stringify(error),
                className: 'Error'
            };
        }
    }

    private getFullLog({executionDate, log}: { executionDate: Date, log: ILog }): IFullLog {
        let message = `[${this._options.service.name}] ${log.message}`;
        if (log.elapsedTimeInMilliseconds) {
            message = `${message} in ${log.elapsedTimeInMilliseconds}ms`;
        }

        return {
            customMessage: log.message,
            message,
            service: this._options.service,
            environment: this._options.environment || 'Development',
            executionDate,
            entrypoint: 'Execute',
            method: log.method,
            correlationId: log.correlationId,
            content: log.content,
            exeption: RestLogger.getException(log.error),
            level: log.level,
            elapsedTimeInMilliseconds: log.elapsedTimeInMilliseconds
        };
    }
}
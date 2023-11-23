export interface IRestLoggerOptions {
    environment: 'Development' | 'Staging' | 'Production',
    restLoggerUrl: string;
    batchLogIntervalInSeconds: number;
    timeoutInSeconds: number;
    service: {
        name: string;
        version: string;
    };
}
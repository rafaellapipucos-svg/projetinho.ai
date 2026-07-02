import "server-only";
import pino from "pino";

/** Mapeia níveis do pino para os nomes de severidade do Cloud Logging. */
const gcpSeverity: Record<string, string> = {
  trace: "DEBUG",
  debug: "DEBUG",
  info: "INFO",
  warn: "WARNING",
  error: "ERROR",
  fatal: "CRITICAL",
};

const level = process.env.LOG_LEVEL ?? "info";

export const logger =
  process.env.NODE_ENV === "production"
    ? pino({
        level,
        messageKey: "message",
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
          level(label) {
            return { severity: gcpSeverity[label] ?? "DEFAULT" };
          },
        },
      })
    : pino({
        level,
        transport: { target: "pino-pretty", options: { colorize: true } },
      });

import { connect } from "./agent/bot";

import { setLastEvalError } from './utils/errorStore';

process.on("unhandledRejection", (reason: any) => {
    console.error("⚠️  [UNHANDLED REJECTION]", reason);
    setLastEvalError(reason?.message || String(reason));
});

process.on("uncaughtException", (err: any) => {
    console.error("💥 [UNCAUGHT EXCEPTION]", err);
    setLastEvalError(err?.message || String(err));
});


const bot = connect(process.env.PORT ? Number(process.env.PORT) : undefined);

export {bot};
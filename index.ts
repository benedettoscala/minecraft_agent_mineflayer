import { connect } from "./agent/bot";


const bot = connect(process.env.port ? Number(process.env.port) : undefined);

export {bot};
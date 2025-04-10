import { connect } from "./bot";




const bot = connect(process.env.port);

export {bot};
import adminMeHandler from './me.js'

export default async function handler(req, res) {
  return adminMeHandler(req, res)
}

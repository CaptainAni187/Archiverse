import path from 'node:path'
import dotenv from 'dotenv'

const envPath = path.resolve(process.cwd(), '.env')
const envLocalPath = path.resolve(process.cwd(), '.env.local')

dotenv.config({ path: envLocalPath })
dotenv.config({ path: envPath })

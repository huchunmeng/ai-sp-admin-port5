import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dotenv from 'dotenv'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..', '..')

// 尝试加载 .env
const envPath = resolve(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const DATA_DIR = resolve(ROOT, process.env.DATA_DIR || 'apps/admin/public')
const CASES_DIR = resolve(DATA_DIR, 'data/cases')
const PROMPTS_DIR = resolve(ROOT, 'services/ai-generator/prompts/06-aisp')

export default {
  PORT: parseInt(process.env.PORT, 10) || 3200,
  ROOT,
  DATA_DIR,
  CASES_DIR,
  PROMPTS_DIR,
  SP_API_PORT: parseInt(process.env.SP_API_PORT, 10) || 5100,
  LLM_API_KEY: process.env.LLM_API_KEY || '',
  LLM_API_URL: process.env.LLM_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  LLM_MODEL: process.env.LLM_MODEL || 'qwen-turbo',
  AI_GENERATE_API_KEY: process.env.AI_GENERATE_API_KEY || '',
  AI_GENERATE_API_URL: process.env.AI_GENERATE_API_URL || 'https://api.openai.com/v1/chat/completions',
  AI_GENERATE_MODEL: process.env.AI_GENERATE_MODEL || 'gpt-4o',
  AI_GEN_ENABLED: process.env.VITE_ENABLE_AI_GENERATE === 'true',
}

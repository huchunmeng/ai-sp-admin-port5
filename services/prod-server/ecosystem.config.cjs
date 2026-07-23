// PM2 Ecosystem 配置
// 使用: pm2 start ecosystem.config.js
// 注意: 请先将 .env.example 复制为 .env 并填入真实 API Key

module.exports = {
  apps: [
    {
      name: 'aisp-sp-api',
      script: 'src/index.js',
      cwd: './services/sp-api',
      interpreter: 'node',
      env_file: './services/sp-api/.env',
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/sp-api-error.log',
      out_file: './logs/sp-api-out.log',
    },
    {
      name: 'aisp-prod-server',
      script: 'src/index.js',
      cwd: './services/prod-server',
      interpreter: 'node',
      env_file: './services/prod-server/.env',
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/prod-server-error.log',
      out_file: './logs/prod-server-out.log',
    },
  ],
}

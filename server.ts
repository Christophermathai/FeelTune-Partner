import { createServer, ServerOptions } from 'https';
import { parse } from 'url';
import next from 'next';
import fs from 'fs';
import path from 'path';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions: ServerOptions = {
  key: fs.readFileSync(path.join(process.cwd(), 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(process.cwd(), 'localhost.pem'))
};

const PORT = process.env.PORT || 3000;

async function startServer(): Promise<void> {
  try {
    await app.prepare();

    createServer(httpsOptions, async (req, res) => {
      try {
        const parsedUrl = parse(req.url ?? '', true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    }).listen(PORT, () => {
      console.log(`> Ready on https://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

startServer().catch(console.error);
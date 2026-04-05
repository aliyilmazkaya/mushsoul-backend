import 'dotenv/config';
import express from 'express';
import { paytrRouter } from './routes/paytr.js';
import { adminRouter } from './routes/admin.js';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'mushsoul-paytr-dhl-backend' }));
app.get('/', (_req, res) => res.type('html').send('<h1>MushSoul PayTR + DHL Backend</h1><p>Çalışıyor.</p>'));
app.use('/paytr', paytrRouter);
app.use('/admin', adminRouter);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: err.message || 'Unexpected server error' });
});
const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`MushSoul backend running on http://localhost:${port}`));

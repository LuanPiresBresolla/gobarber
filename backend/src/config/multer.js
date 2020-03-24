import multer from 'multer';
import crypto from 'crypto';
import { extname, resolve } from 'path';

export default {
  // Configurando onde os arquivos de upload vão ser encaminhados
  storage: multer.diskStorage({
    destination: resolve(__dirname, '..', '..', 'tmp', 'uploads'),
    // formatando o nome de arquivo das imagens
    filename: (req, file, cb) => {
      crypto.randomBytes(16, (err, res) => {
        if (err) return cb(err);

        return cb(null, res.toString('hex') + extname(file.originalname));
      });
    },
  }),
};

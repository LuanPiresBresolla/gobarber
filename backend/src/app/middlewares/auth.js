import jwt from 'jsonwebtoken';
import { promisify } from 'util';

import authConfig from '../../config/auth';

export default async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  // Pegando somente o valor do token que vem no vetor.
  const [, token] = authHeader.split(' ');

  try {
    // Decodificando o token
    const decoded = await promisify(jwt.verify)(token, authConfig.secrect);

    // Colocando o valor do ID do usuário nas requisições
    req.userId = decoded.id;

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalid' });
  }
};

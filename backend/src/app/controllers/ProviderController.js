import User from '../models/User';
import File from '../models/File';

class ProviderController {
  async index(req, res) {
    const providers = await User.findAll({
      where: { provider: true }, // Condições para a query
      attributes: ['id', 'name', 'email', 'avatar_id'], // Campos da tabela que eu quero trazer
      include: [
        {
          // Fazendo o relacionamento do model de User com File
          model: File, // Apontando o model
          as: 'avatar', // Falando o nome do relacionamento
          attributes: ['name', 'path', 'url'], // Quais campos eu quero da tabela secundária
        },
      ],
    });

    return res.json(providers);
  }
}

export default new ProviderController();

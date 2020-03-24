import Notificaion from '../schemas/Notification';
import User from '../models/User';

class NotificationController {
  async index(req, res) {
    // Verificando se o usuário é provider para mostrar as notificações
    const checkIsProvider = await User.findOne({
      where: { id: req.userId, provider: true },
    });

    if (!checkIsProvider) {
      return res
        .status(400)
        .json({ error: 'Only provider can load notifications' });
    }

    // Buscandon notificações no mongoDB
    const notifications = await Notificaion.find({
      user: req.userId,
    })
      .sort({ createdAt: 'desc' })
      .limit(20);

    return res.json(notifications);
  }

  async update(req, res) {
    // Criando metodo para buscar e atualizar a notificação
    const notification = await Notificaion.findByIdAndUpdate(
      req.params.id, // ID
      { read: true }, // Campo a ser alterado
      { new: true } // Retornando o novo valor da tabela
    );

    return res.json(notification);
  }
}

export default new NotificationController();

import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';

import User from '../models/User';
import File from '../models/File';
import Appointment from '../models/Appointment';
import Notification from '../schemas/Notification';

import CancellationMail from '../jobs/CancellationMail';
import Queue from '../../lib/Queue';

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query;

    // Listando os agendamentos do usuário
    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null },
      order: ['date'],
      attributes: ['id', 'date', 'past', 'cancelable'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });

    return res.json(appointments);
  }

  async store(req, res) {
    // Criando schema de validação dos dados de entrada
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    // Verificando informação da entrada de dados
    if (!schema.isValid(req.body)) {
      return res.status(400).json({ error: 'Validations fails' });
    }

    // Verificando se o usuário não é um provider
    const userIsProvider = await User.findOne({
      where: { id: req.userId, provider: true },
    });

    if (userIsProvider) {
      return res
        .status(401)
        .json({ error: 'Provider cannot create a new appointment' });
    }

    const { provider_id, date } = req.body;

    // Verificando se o provider está habilitado como true
    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    // Se o provider for inválido retorna essa mensagem
    if (!isProvider) {
      return res
        .status(401)
        .json({ error: 'You can only create appointments with providers' });
    }

    // Pegando somente a hora e não os minutos
    const hourStart = startOfHour(parseISO(date));

    // Verificando se a data enviada não é anterior a data atual
    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    // Checando se o provider já não tem horário agendando
    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      return res
        .status(400)
        .json({ error: 'Appointment date is not available' });
    }

    // Criando o agendamento
    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date: hourStart,
    });

    // Criando notificação para o prestador de serviço

    // Buscando novo do cliente
    const user = await User.findByPk(req.userId);
    // Formatando a data de agendamento para mostrar na notificação
    const formattedDate = format(
      hourStart,
      "'dia' dd 'de' MMMM', às' H:mm'h'",
      { locale: pt }
    );
    // Criando notificação no mongo
    await Notification.create({
      content: `Novo agendamento de ${user.name} para ${formattedDate}`,
      user: provider_id,
    });

    return res.json(appointment);
  }

  async delete(req, res) {
    // Buscando dados do agendamento para cancelar
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    // Conferindo os usuários para verificar se tem permissão para cancelar
    if (appointment.user_id !== req.userId) {
      return res.status(401).json({
        error: "You don't have permission to cancel this appointment",
      });
    }

    /*
      Pegando a data do agendamento e
      diminuindo duas horas, que vai ser o prazo limite
      para realizar o cancelamento do appointment
    */
    const dateWithSub = subHours(appointment.date, 2);

    /*
      comparando o dateWithSub com a data
      atual para ver se é possível realizar
      o cancelamento
    */
    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error: 'You can only cancel appointments 2 hours in advance',
      });
    }

    // Salvando a data de cancelamento no banco de dados
    appointment.canceled_at = new Date();

    await appointment.save();

    // Fazendo o envio de email para o provider
    await Queue.add(CancellationMail.key, { appointment });

    return res.json(appointment);
  }
}

export default new AppointmentController();

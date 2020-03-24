import Bee from 'bee-queue';
import CancellationMail from '../app/jobs/CancellationMail';
import redisConfig from '../config/redis';

const jobs = [CancellationMail]; // Parecido com os models em database/index.

class Queue {
  constructor() {
    this.queues = {};

    this.init();
  }

  init() {
    jobs.forEach(({ key, handle }) => {
      // Percorrendo vetor de jobs e adicionando os jobs na queue
      this.queues[key] = {
        bee: new Bee(key, {
          redis: redisConfig,
        }),
        handle,
      };
    });
  }

  add(queue, job) {
    // Colocando novo serviço na fila para ser executado
    return this.queues[queue].bee.createJob(job).save();
  }

  processQueue() {
    // Processando os jobs
    jobs.forEach(job => {
      const { bee, handle } = this.queues[job.key];

      bee.on('faield', this.handleFailure).process(handle);
    });
  }

  handleFailure(job, err) {
    // Função que retorna algum erro ao tentar enviar o email
    console.log(`Queue ${job.queue.name}: FAILED`, err);
  }
}

export default new Queue();

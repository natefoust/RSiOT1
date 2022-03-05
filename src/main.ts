import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PubSub } from '@google-cloud/pubsub';
import e from 'express';
const { uuid } = require('uuidv4');

const fs = require('fs');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  fs.writeFileSync("./swagger-spec.json", JSON.stringify(document));
  SwaggerModule.setup('/', app, document);
  
  const pubsub = new PubSub({projectId: 'lab2-341310'});
  app.use(function(request, response, next) {
    const question = pubsub.topic('request_receiver')
    const answer = pubsub.topic('response_sender')
    
    let id = uuid.uuidv4()
    question.publish(Buffer.from(id))
    let subscription = answer.subscription('response_sender-sub')
    subscription.on('message', response => {
      let message = response.data.toString()
      console.log('Received response from topic:' + message)
      let parsed = JSON.parse(message)
      if (parsed[id])
        next()
      else if (parsed[id] == '0' || !parsed[id])
        response.status(400).send({error: true, message})
      subscription.close()
    })

  })
  await app.listen(3000);
}
bootstrap();

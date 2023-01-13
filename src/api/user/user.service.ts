import {UserInterface} from './user.model';
import {v4 as uuidv4} from 'uuid';
import {Request} from 'express';
import {calculateAge} from './utils/userDate.util';
import {IBasicService} from '../shared/services/IBasicService.interface';

export class UserService implements IBasicService {
  // CTOR
  public constructor() {}

  // METHODS
  getFulanoAge = (): string => {
    const fulano: UserInterface = {
      id: uuidv4(),
      name: 'fulano',
      surname: 'mengano',
      dateOfBirth: new Date(1993, 7, 14).toISOString(),
    };

    return `${fulano.name} ${fulano.surname} has ${calculateAge(
      fulano,
    )} years old`;
  };

  create = (req: Request): UserInterface => {
    const {name, surname, dateOfBirth} = req.body;
    return {
      id: uuidv4(),
      name,
      surname,
      dateOfBirth,
    };
  };

  // OVERRIDE
  name(): string {
    return UserService.name;
  }
}

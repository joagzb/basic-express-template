import {v4 as uuidv4} from 'uuid';
import {calculateAge} from 'api/user/user.util';
import {UserInterface} from '../api/user/user.model';
import DateFormatterUtil from '../helpers/DateFormatter.util';

describe('test stack ', () => {
  test('cast a Date object to string dd-mm-yyyy format', () => {
    const dateToTest: Date = new Date(2000, 5, 10);
    const dateFormatted: string = DateFormatterUtil.date_to_ddmmyyyy_string(dateToTest);

    expect(dateFormatted).toBe('10-05-2000');
  });

  test('cast a string yyyy-mm-dd date format to a date object', () => {
    const dateToTest = '2000-05-10';
    const dateFormatted: Date = DateFormatterUtil.yyyymmdd_string_to_date(dateToTest);

    expect(dateFormatted).toEqual(new Date(2000, 5, 10));
  });

  test('calculate the user age', () => {
    const newUser: UserInterface = {
      id: uuidv4(),
      name: 'carlos',
      surname: 'alcaraz',
      dateOfBirth: '2000-06-03',
    };

    const userAge: number = calculateAge(newUser);

    expect(userAge).toBe(22);
  });
});

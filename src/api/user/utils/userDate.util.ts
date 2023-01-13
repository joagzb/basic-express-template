import DateFormatterUtil from '../../../helpers/DateFormatter.util';
import {UserInterface} from '../user.model';

export const calculateAge = (user: UserInterface): number => {
  const today: Date = new Date(Date.now());
  const birthday: Date = DateFormatterUtil.yyyymmdd_string_to_date(
    user.dateOfBirth,
  );
  const timeDiff = today.getTime() - birthday.getTime();

  return Math.floor(timeDiff / (1000 * 3600 * 24) / 365.25);
};

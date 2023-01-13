const date_to_ddmmyyyy_string = (date: Date): string => {
  const day: string =
    date.getDate() < 10 ? `0${date.getDate()}` : `${date.getDate()}`;
  const month: string =
    date.getMonth() < 10 ? `0${date.getMonth()}` : `${date.getMonth()}`;
  const year = `${date.getFullYear()}`;

  return `${day}-${month}-${year}`;
};

const yyyymmdd_string_to_date = (date: string): Date => {
  const [year, month, day] = date
    .split('-')
    .map(stringNumber => Number.parseInt(stringNumber));

  return new Date(year, month, day);
};

export default {
  date_to_ddmmyyyy_string,
  yyyymmdd_string_to_date,
};

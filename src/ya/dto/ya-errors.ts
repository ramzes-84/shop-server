export type ErrorYaResDTO = {
  message: string;
  code: string;
  details: {
    message: string;
    code: string;
    error_details: string[];
    details: { details: string[] };
  };
};

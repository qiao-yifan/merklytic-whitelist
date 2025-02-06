import { Readable } from "stream";
import { parse, Parser } from "csv-parse";

const parseCsvFile = async (fileStream: Readable): Promise<unknown[]> => {
  const records: unknown[] = [];
  const parser: Parser = fileStream.pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }),
  );

  for await (const record of parser) {
    records.push(record);
  }

  return records;
};

export { parseCsvFile };

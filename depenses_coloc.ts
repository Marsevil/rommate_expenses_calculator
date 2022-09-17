import {readLines} from "https://deno.land/std/io/buffer.ts";

interface Count {
  total: number;
  counts: Map<string, number>;
}

class ParsingError extends Error {
  constructor(unrognisePattern: string) {
    super();
    this.unrocognisePattern = unrognisePattern;
  } 
  
  readonly unrocognisePattern: string;
}

class NoTotalError extends Error {}

class RedefinedTotalError extends Error {}

function printCount(count: Count): void {
  // Process non common expenses
  let nonCommons = 0;
  for (const value of count.counts.values()) {
    nonCommons += value;
  }

  // Process common expenses
  const commons = count.total - nonCommons;

  // Print all values
  console.log("Dépenses totales:", count.total);
  console.log("Dépenses communes :", commons);
  console.log("Dépenses non communes :", nonCommons);
  console.table(count.counts);
}

async function countFromReader(reader: Deno.Reader): Promise<Count> {
  const matchPattern = /(total|[fsin]+)\ [1-9]*\.?[1-9]*/

  // Explain how to use
  //console.log("1. Entrer la somme totale");
  //console.log("2. Entrer les dépenses individuel en utilisant les caractère f, s, n et/ou i suivi du montant (ex : fi 123)");
  //console.log("3. Terminer la saisie en entrant le caractère '.'");

  // Ask for total.
  //console.log("Total :");
  let total: number | null = null;

  // Start by waiting for an input
  const values = new Map<string, number>();

  for await (const line of readLines(reader)) {
    const formatedLine = line.trim();
    
    if (formatedLine === "") continue;
    //if (line === ".") break;
  
    // Check if the pattern match.
    if (matchPattern.test(formatedLine)) { 
      // Build key & value
      const table = formatedLine.split(" ");
      const key = table[0];
      const value = Number.parseFloat(table[1]);
      
      if (key == "total") {
        if (!total) {
          total = value;
        } else {
          throw new RedefinedTotalError;
        }
      } else {
        // Normalise key
        const formatedKey = key.split("").sort().join("");

        // Insert value in the table
        const currentValue = values.get(formatedKey);
        values.set(formatedKey, (currentValue || 0.0) + value);
      }
    } else {
      throw new ParsingError(line);
    }
  }
  
  if (!total) throw new NoTotalError;
  
  return {
    total: total,
    counts: values
  }
}

try {
  const file = await Deno.open(Deno.args[0]);
  const count = await countFromReader(file);
  printCount(count);
} catch (e) {
  if (e instanceof ParsingError) {
    console.error("Parsing error : " + e.unrocognisePattern);
  } else {
    throw e;
  }
}


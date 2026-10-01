export type FactInputError = {
  index: number;
  message: string;
};

const MIN_FACT_LENGTH = 10;
const MAX_FACT_LENGTH = 300;

export function normalizeFact(value: string): string {
  return value.trim().replaceAll(/\s+/g, " ");
}

export function getFactInputErrors(facts: string[]): FactInputError[] {
  const normalizedFacts = facts.map(normalizeFact);
  const seenFacts = new Set<string>();

  return normalizedFacts.flatMap((fact, index) => {
    if (!fact) {
      return [];
    }

    if (fact.length < MIN_FACT_LENGTH) {
      return [{ index, message: "10文字以上で入力してください。" }];
    }

    if (fact.length > MAX_FACT_LENGTH) {
      return [{ index, message: "300文字以内で入力してください。" }];
    }

    const duplicate = seenFacts.has(fact);
    seenFacts.add(fact);

    return duplicate ? [{ index, message: "同じFactが入力されています。" }] : [];
  });
}

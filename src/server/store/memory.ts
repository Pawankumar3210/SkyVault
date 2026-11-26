export interface DataStore {
  list<T>(collection: string): Promise<T[]>;
  get<T>(collection: string, id: string): Promise<T | null>;
  save<T extends { id: string }>(collection: string, entity: T): Promise<T>;
  remove(collection: string, id: string): Promise<void>;
}

export class MemoryStore implements DataStore {
  private collections = new Map<string, Map<string, unknown>>();

  private bag(collection: string) {
    let map = this.collections.get(collection);
    if (!map) {
      map = new Map();
      this.collections.set(collection, map);
    }
    return map;
  }

  async list<T>(collection: string): Promise<T[]> {
    return [...this.bag(collection).values()] as T[];
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    return (this.bag(collection).get(id) as T | undefined) ?? null;
  }

  async save<T extends { id: string }>(collection: string, entity: T): Promise<T> {
    const copy = structuredClone(entity);
    this.bag(collection).set(copy.id, copy);
    return copy;
  }

  async remove(collection: string, id: string): Promise<void> {
    this.bag(collection).delete(id);
  }
}

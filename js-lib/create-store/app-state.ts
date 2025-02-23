import type { JsonObject, JsonValue } from 'type-fest';

import type { BaseAction, Slice, SliceStateField } from './app-state-slice';

class AppStateConfig<S, A extends BaseAction, Op> {
  slices: SliceArray<S, A> = [];
  slicesByKey: { [k: string]: Slice<any, A, S> } = Object.create(null);
  fields: FieldDesc<S, A, Op>[] = [];
  opts?: Op;

  constructor(slices: SliceArray<S, A>, opts?: Op) {
    this.opts = opts;

    slices.forEach((slice) => {
      if (this.slicesByKey[slice.key]) {
        throw new RangeError(
          'Adding different instances of an existing slice (' + slice.key + ')',
        );
      }

      this.slices.push(slice);
      this.slicesByKey[slice.key] = slice;

      if (slice.spec.state) {
        this.fields.push(new FieldDesc(slice.key, slice.spec.state, slice));
      }
    });
  }
}

export class AppState<S = any, A extends BaseAction = any, Op = any> {
  static create<S, A extends BaseAction, Op = any>({
    slices,
    opts,
  }: {
    slices: SliceArray<S, A>;
    opts?: Op;
  }): AppState<S, A, Op> {
    const config = new AppStateConfig(slices, opts);
    const instance = new AppState(config);

    config.fields.forEach((f) => {
      instance.slicesCurrentState[f.name] = f.init(config, instance);
    });

    return instance;
  }

  static stateFromJSON<S, A extends BaseAction = any, Op = any>({
    slices,
    json,
    // an object with a unique name for each
    // slice used from uniquely identifying a
    // slices data.
    sliceFields,
    opts,
  }: {
    slices: SliceArray<S, A>;
    json: JsonValue;
    sliceFields: { [key: string]: Slice<any, any> };
    opts?: Op;
  }) {
    const config = new AppStateConfig(slices, opts);
    const instance = new AppState(config);

    config.fields.forEach((f) => {
      for (var prop in sliceFields) {
        const slice = sliceFields[prop];
        const state = slice?.spec.state;
        if (
          slice &&
          slice.key === f.name &&
          state &&
          state.stateFromJSON &&
          Object.prototype.hasOwnProperty.call(json, prop)
        ) {
          // This field belongs to a plugin mapped to a JSON field, read it from there.
          instance.slicesCurrentState[f.name] = state.stateFromJSON.call(
            slice,
            config,
            json![prop],
            instance,
          );
          return;
        }
      }
      instance.slicesCurrentState[f.name] = f.init(config, instance);
    });

    return instance;
  }

  stateToJSON({
    sliceFields,
  }: {
    sliceFields?: { [key: string]: Slice<any, any> };
  }): JsonObject {
    let result = {};
    for (var prop in sliceFields) {
      const slice = sliceFields[prop];
      const state = slice?.spec.state;
      if (state && state.stateToJSON) {
        result[prop] = state.stateToJSON.call(
          slice,
          this.getSliceState(slice.key)!,
        );
      }
    }

    return result;
  }

  protected slicesCurrentState: { [k: string]: any } = Object.create(null);

  constructor(public config: AppStateConfig<S, A, Op>) {}

  applyAction(action: A): AppState<S, A, Op> {
    let newInstance = new AppState(this.config);

    this.config.fields.forEach((field) => {
      if (field.apply) {
        newInstance.slicesCurrentState[field.name] = field.apply(
          action,
          this.getSliceState(field.name),
          newInstance,
        );
      } else {
        newInstance.slicesCurrentState[field.name] = this.getSliceState(
          field.name,
        );
      }
    });

    return newInstance;
  }

  getSlices() {
    return this.config.slices;
  }

  getSliceByKey<SL, A extends BaseAction, S>(
    key: string,
  ): Slice<SL, A, S> | undefined {
    return this.config.slicesByKey[key] as any;
  }

  getSliceState<SL>(key: string): SL | undefined {
    return this.slicesCurrentState[key];
  }
}

function bind(f?: Function, self?: object) {
  return !self || !f ? f : f.bind(self);
}

type SliceArray<S, A extends BaseAction> = Array<Slice<any, A, S>>;

class FieldDesc<S, A extends BaseAction, Op> {
  init: (config: { [key: string]: any }, appState: AppState<S, A, Op>) => any;
  apply?: (action: any, value: any, appState: AppState<S, A, Op>) => any;

  constructor(
    public name: string,
    desc: {
      init: SliceStateField<any, any, S>['init'];
      apply?: SliceStateField<any, any, S>['apply'];
    },
    self: SliceArray<S, A>[0],
  ) {
    this.init = bind(desc.init, self);

    if (desc.apply) {
      this.apply = bind(desc.apply, self);
    }
  }
}

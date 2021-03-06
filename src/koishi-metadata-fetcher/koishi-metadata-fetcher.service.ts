import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MetadataArrayMap } from '../utility/koishi.constants';
import {
  MetadataArrayValue,
  MetadataGenericMap,
  MetadataMapValue,
} from '../utility/koishi.interfaces';

@Injectable()
export class KoishiMetadataFetcherService {
  constructor(private readonly reflector: Reflector) {}

  getPropertyMetadataArray<K extends keyof MetadataArrayMap, I = any>(
    metadataKey: K,
    instance: I,
    instanceKey: keyof I,
  ) {
    return [
      ...this.getMetadataArray<K>(metadataKey, instance.constructor),
      ...this.getMetadataArray<K>(metadataKey, instance[instanceKey]),
    ];
  }

  getMetadataArray<K extends keyof MetadataArrayMap>(
    metadataKey: K,
    instance: any,
  ) {
    return (
      this.reflector.get<MetadataArrayValue<K>>(metadataKey, instance) || []
    );
  }

  getMetadata<K extends keyof MetadataGenericMap>(
    metadataKey: K,
    instance: any,
  ) {
    return this.reflector.get<MetadataMapValue<K>>(metadataKey, instance);
  }
}

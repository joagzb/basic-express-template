import {Router} from 'express';

export interface RouteDefinition {
  readonly path: string;
  readonly router: Router;
}

export abstract class BaseRoutes<T> {
  public readonly definition: RouteDefinition;
  protected readonly router: Router;
  protected readonly controller: T;

  protected constructor(path: string, controller: T) {
    this.router = Router();
    this.controller = controller;
    this.definition = {path, router: this.router};
  }

  protected abstract registerEndpoints(controller: T): void;
}

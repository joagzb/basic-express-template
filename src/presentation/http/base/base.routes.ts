import { RequestHandler, Router } from "express";

export interface RouteDefinition {
    readonly path: string;
    readonly router: Router;
  }

export abstract class BaseRoutes {
    public definitions: RouteDefinition;
    public router: Router;

    public constructor() {
        this.router = Router();

        this.definitions = {
            path: '/', 
            router: this.router
        };
    }

    
    
}

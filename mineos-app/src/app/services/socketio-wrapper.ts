import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { share } from 'rxjs/operators';
import { Socket, io } from 'socket.io-client';

/**
 * Due to the use of namespaced sockets ngx-socket-io does not seem to work
 * Original source for this class from https://github.com/rodgc/ngx-socket-io/blob/master/src/socket-io.service.ts
 * @param eventName name of the Event to listen for.
 */
@Injectable({
  providedIn: 'root',
})
export class SocketioWrapper {
  private socketMap: Map<string, Socket> = new Map<string, Socket>();
  subscribersCounter: Record<string, number> = {};
  eventObservables$: Record<string, Observable<any>> = {};

  constructor() {
    let socket = io();
    this.socketMap.set('/', socket);
    socket.connect();
  }
  private getSocket(namespace?: string): Socket {
    if (namespace === undefined || namespace == null || namespace === '') {
      namespace = '/';
    }
    let socket = this.socketMap.get(namespace);
    if (socket == undefined) {
      throw new Error(`unable to get socket for ${namespace}`);
    } else {
      return socket;
    }
  }

  addNamespace(namespace: string) {
    if (!this.socketMap.has(namespace)) {
      this.socketMap.set(namespace, io(`/${namespace}`));
    }
  }

  on(eventName: string, namespace: string, callback: Function) {
    let socket: any = this.getSocket(namespace);
    return socket.on(eventName, callback);
  }

  once(eventName: string, namespace: string, callback: Function) {
    let socket: any = this.getSocket(namespace);
    return socket.once(eventName, callback);
  }

  connect(namespace?: string) {
    let socket: any = this.getSocket(namespace);
    return socket.connect();
  }

  disconnect(_close?: any) {
    this.socketMap.forEach((socket: any) => {
      socket?.disconnect.apply(socket, arguments);
    });
  }

  emit(_eventName: string, namespace: string, ..._args: any[]) {
    let socket: any = this.getSocket(namespace);
    return socket.emit.apply(this.getSocket(namespace), _args);
  }

  removeListener(_eventName: string, namespace: string, _callback?: Function) {
    let socket: any = this.getSocket(namespace);
    return socket.removeListener.apply(this.getSocket(namespace), arguments);
  }

  removeAllListeners(namespace?: string, _eventName?: string) {
    let socket: any = this.getSocket(namespace);
    return socket.removeAllListeners.apply(
      this.getSocket(namespace),
      arguments
    );
  }

  fromEvent<T>(eventName: string, namespace?: string): Observable<T> {
    let eventKey: string = this.getEventKey(eventName, namespace);
    if (!this.subscribersCounter[eventKey]) {
      this.subscribersCounter[eventKey] = 0;
    }
    this.subscribersCounter[eventKey]++;

    if (!this.eventObservables$[eventKey]) {
      this.eventObservables$[eventKey] = new Observable((observer: any) => {
        const listener = (data: T) => {
          observer.next(data);
        };
        this.getSocket(namespace).on(eventName, listener);
        return () => {
          this.subscribersCounter[eventKey]--;
          if (this.subscribersCounter[eventKey] === 0) {
            let socket: any = this.getSocket(namespace);
            socket.removeListener(eventName, listener);
            delete this.eventObservables$[eventKey];
          }
        };
      }).pipe(share());
    }
    return this.eventObservables$[eventKey];
  }

  fromOneTimeEvent<T>(eventName: string, namespace?: string): Promise<T> {
    let nsp: string;
    if (namespace === undefined || namespace == null || namespace === '')
      nsp = '/';
    else nsp = namespace;
    return new Promise<T>((resolve) => this.once(eventName, nsp, resolve));
  }
  private getEventKey(eventName: string, namespace?: string): string {
    if (namespace === undefined || namespace == null || namespace === '')
      return `nsp_root_event_${eventName}`;
    else return `nsp_${namespace}_event_${eventName}`;
  }
}

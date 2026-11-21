type TypedMessage = { readonly type: string };

/** Indexes a discriminated union by its `type` discriminator. */
export type MessageByType<TMessage extends TypedMessage> = {
  [TItem in TMessage as TItem['type']]: TItem;
};

/** One handler per message type; the compiler requires every type to be handled. */
export type MessageHandlers<TMessageMap> = {
  readonly [TType in keyof TMessageMap]: (message: TMessageMap[TType]) => void;
};

/**
 * Routes a message to its handler without a `switch`.
 * Pass `message.type` and `message` from the same object.
 */
export function dispatchMessage<TMessageMap, TType extends keyof TMessageMap>(
  handlers: MessageHandlers<TMessageMap>,
  type: TType,
  message: TMessageMap[TType]
): void {
  handlers[type](message);
}

import { dispatchMessage, type MessageByType, type MessageHandlers } from './message-dispatch';

type TestMessage =
  { readonly type: 'count'; readonly value: number } | { readonly type: 'name'; readonly name: string };

const countValue = 3;

describe('dispatchMessage', () => {
  it('routes each message to the handler registered for its type', () => {
    const handlers: MessageHandlers<MessageByType<TestMessage>> = { count: jest.fn(), name: jest.fn() };
    const message: TestMessage = { type: 'count', value: countValue };

    dispatchMessage(handlers, message.type, message);

    expect(handlers.count).toHaveBeenCalledWith(message);
    expect(handlers.name).not.toHaveBeenCalled();
  });
});

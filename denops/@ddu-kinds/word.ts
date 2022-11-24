import {
  ActionArguments,
  ActionFlags,
  BaseKind,
  DduItem,
} from "https://deno.land/x/ddu_vim@v2.0.0/types.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v2.0.0/deps.ts";

export type ActionData = {
  text: string;
  regType?: string;
};

type Params = Record<never, never>;

export class Kind extends BaseKind<Params> {
  override actions: Record<
    string,
    (args: ActionArguments<Params>) => Promise<ActionFlags>
  > = {
    append: async (args: { denops: Denops; items: DduItem[] }) => {
      for (const item of args.items) {
        await paste(args.denops, item, "p");
      }
      return Promise.resolve(ActionFlags.None);
    },
    feedkeys: async (args: { denops: Denops; items: DduItem[] }) => {
      for (const item of args.items) {
        await feedkeys(args.denops, item);
      }
      return Promise.resolve(ActionFlags.None);
    },
    insert: async (args: { denops: Denops; items: DduItem[] }) => {
      for (const item of args.items) {
        await paste(args.denops, item, "P");
      }
      return Promise.resolve(ActionFlags.None);
    },
  };

  override params(): Params {
    return {};
  }
}

const paste = async (denops: Denops, item: DduItem, pasteKey: string) => {
  const action = item?.action as ActionData;

  if (action.text == null) {
    return;
  }

  const regType = action.regType ? action.regType : "v";

  const oldValue = fn.getreg(denops, '"');
  const oldType = fn.getregtype(denops, '"');

  await fn.setreg(denops, '"', action.text, regType);
  try {
    await denops.cmd('normal! ""' + pasteKey);
  } finally {
    await fn.setreg(denops, '"', oldValue, oldType);
  }

  // Open folds
  await denops.cmd("normal! zv");
};

const feedkeys = async (denops: Denops, item: DduItem) => {
  const action = item?.action as ActionData;

  if (action.text == null) {
    return;
  }

  // Use feedkeys() instead
  await fn.feedkeys(denops, action.text, "n");
};

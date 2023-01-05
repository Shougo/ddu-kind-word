import {
  ActionArguments,
  ActionFlags,
  BaseKind,
  DduItem,
} from "https://deno.land/x/ddu_vim@v2.0.0/types.ts";
import { Denops, fn, vars } from "https://deno.land/x/ddu_vim@v2.0.0/deps.ts";
import { DdcItem } from "https://deno.land/x/ddc_vim@v3.4.0/types.ts";


export type ActionData = {
  text: string;
  regType?: string;
  item?: DdcItem;
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
    complete: async (args: { denops: Denops; items: DduItem[] }) => {
      for (const item of args.items) {
        await feedkeys(args.denops, item);
        const completedItem = (item?.action as ActionData)?.item;
        if (!completedItem) {
          continue;
        }

        try {
          vars.g.set(args.denops, "completed_item", completedItem);
        } catch(_: unknown) {
          // Ignore
        }

        await args.denops.cmd("silent! doautocmd <nomodeline> CompleteDone");
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

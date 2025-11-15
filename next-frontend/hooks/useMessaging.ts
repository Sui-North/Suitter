import {
  useCurrentAccount,
  useSuiClient,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CONFIG from "../config/index";

// Your deployed package ID
const PACKAGE_ID = CONFIG.VITE_PACKAGE_ID;
const CLOCK_OBJECT_ID = "0x6";

export interface Message {
  sender: string;
  encryptedMessage: number[];
  contentHash: number[];
  sentTimestamp: string;
  isRead: boolean;
  text?: string;
}

export interface Chat {
  id: string;
  sender: string;
  receiver: string;
  messages: Message[];
}

export interface Channel {
  id: string;
  name: string;
  members: number;
  messagesCount: number;
  lastMessage: {
    text: string;
    sender: string;
    timestamp: number;
  } | null;
  creator: string;
}

export function useMessaging() {
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  // Fetch user's chats
  const { data: chats, isLoading: isLoadingChats } = useQuery({
    queryKey: ["chats", currentAccount?.address],
    queryFn: async () => {
      if (!currentAccount?.address) return [];

      try {
        // Get all Chat objects where user is sender or receiver
        const ownedObjects = await client.getOwnedObjects({
          owner: currentAccount.address,
          filter: {
            StructType: `${PACKAGE_ID}::messaging::Chat`,
          },
          options: {
            showContent: true,
            showType: true,
          },
        });

        return ownedObjects.data.map((obj: any) => ({
          id: obj.data.objectId,
          sender: obj.data.content?.fields?.sender,
          receiver: obj.data.content?.fields?.receiver,
          messages: obj.data.content?.fields?.messages || [],
        }));
      } catch (error) {
        console.error("Error fetching chats:", error);
        return [];
      }
    },
    enabled: !!currentAccount?.address,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Convert chats to channels format for UI compatibility
  const channels: Channel[] = (chats || []).map((chat: Chat) => {
    const otherParty =
      chat.sender === currentAccount?.address ? chat.receiver : chat.sender;
    const shortAddress = `${otherParty.slice(0, 6)}...${otherParty.slice(-4)}`;

    const lastMsg =
      chat.messages && chat.messages.length > 0
        ? chat.messages[chat.messages.length - 1]
        : null;

    return {
      id: chat.id,
      name: shortAddress,
      members: 2,
      messagesCount: chat.messages?.length || 0,
      lastMessage: lastMsg
        ? {
            text: decodeMessage(lastMsg.encryptedMessage),
            sender: lastMsg.sender,
            timestamp: parseInt(lastMsg.sentTimestamp) || 0,
          }
        : null,
      creator: chat.sender,
    };
  });

  // Start a new chat
  const createChannel = useMutation({
    mutationFn: async (receiverAddress: string) => {
      if (!currentAccount?.address) throw new Error("No account connected");

      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::messaging::start_chart`,
        arguments: [
          tx.pure.address(receiverAddress),
          tx.object(CLOCK_OBJECT_ID),
        ],
      });

      return new Promise((resolve, reject) => {
        signAndExecute(
          {
            transaction: tx,
          },
          {
            onSuccess: (result) => {
              console.log("Chat created:", result);
              queryClient.invalidateQueries({ queryKey: ["chats"] });
              resolve(result);
            },
            onError: (error) => {
              console.error("Error creating chat:", error);
              reject(error);
            },
          }
        );
      });
    },
  });

  // Send a message
  const sendMessage = useMutation({
    mutationFn: async ({
      channelId,
      content,
    }: {
      channelId: string;
      content: string;
    }) => {
      if (!currentAccount?.address) throw new Error("No account connected");

      const tx = new Transaction();

      // Convert message to encrypted format (simple encoding for demo)
      const encryptedMessage = Array.from(content).map((char) =>
        char.charCodeAt(0)
      );

      // Create a simple hash of the content
      const contentHash = Array.from(content).map(
        (char) => char.charCodeAt(0) * 31
      );

      tx.moveCall({
        target: `${PACKAGE_ID}::messaging::send_message`,
        arguments: [
          tx.object(channelId),
          tx.pure.vector("u64", encryptedMessage),
          tx.pure.vector("u64", contentHash),
          tx.object(CLOCK_OBJECT_ID),
        ],
      });

      return new Promise((resolve, reject) => {
        signAndExecute(
          {
            transaction: tx,
          },
          {
            onSuccess: (result) => {
              console.log("Message sent:", result);
              queryClient.invalidateQueries({
                queryKey: ["messages", channelId],
              });
              queryClient.invalidateQueries({ queryKey: ["chats"] });
              resolve(result);
            },
            onError: (error) => {
              console.error("Error sending message:", error);
              reject(error);
            },
          }
        );
      });
    },
  });

  // Mark message as read
  const markAsRead = useMutation({
    mutationFn: async ({
      chatId,
      messageIndex,
    }: {
      chatId: string;
      messageIndex: number;
    }) => {
      if (!currentAccount?.address) throw new Error("No account connected");

      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::messaging::mark_as_read`,
        arguments: [
          tx.object(chatId),
          tx.pure.u64(messageIndex),
          tx.object(CLOCK_OBJECT_ID),
        ],
      });

      return new Promise((resolve, reject) => {
        signAndExecute(
          {
            transaction: tx,
          },
          {
            onSuccess: (result) => {
              console.log("Message marked as read:", result);
              queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
              resolve(result);
            },
            onError: (error) => {
              console.error("Error marking message as read:", error);
              reject(error);
            },
          }
        );
      });
    },
  });

  // Get messages for a specific chat
  const useMessages = (channelId: string | null) => {
    return useQuery({
      queryKey: ["messages", channelId],
      queryFn: async () => {
        if (!channelId) return [];

        try {
          const object = await client.getObject({
            id: channelId,
            options: {
              showContent: true,
            },
          });

          if (object.data?.content?.dataType === "moveObject") {
            const fields = (object.data.content as any).fields;
            const messages = fields.messages || [];

            return messages.map((msg: any) => ({
              sender: msg.sender,
              encryptedMessage: msg.encrypted_message,
              contentHash: msg.content_hash,
              sentTimestamp: msg.sent_timestamp,
              timestamp: parseInt(msg.sent_timestamp),
              isRead: msg.is_read,
              // Decode the message
              text: decodeMessage(msg.encrypted_message),
            }));
          }

          return [];
        } catch (error) {
          console.error("Error fetching messages:", error);
          return [];
        }
      },
      enabled: !!channelId,
      refetchInterval: 3000, // Poll every 3 seconds for new messages
    });
  };

  return {
    channels,
    isLoadingChats,
    createChannel: createChannel.mutate,
    sendMessage: sendMessage.mutate,
    markAsRead: markAsRead.mutate,
    useMessages,
    isCreatingChannel: createChannel.isPending,
    isSendingMessage: sendMessage.isPending,
  };
}

// Helper function to decode encrypted messages
export function decodeMessage(encryptedMessage: number[]): string {
  return String.fromCharCode(...encryptedMessage);
}

// Helper function to encode messages
export function encodeMessage(message: string): number[] {
  return Array.from(message).map((char) => char.charCodeAt(0));
}

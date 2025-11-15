

import { useState } from 'react'
import { useSui } from './sui-context'
import { SuitCard } from './suit-card'
import { FeedVertical } from './feed-vertical'

interface Suit {
  id: string
  author: string
  handle: string
  avatar: string
  content: string
  timestamp: number
  likes: number
  replies: number
  reposts: number
  liked: boolean
  isNFT: boolean
  nftValue: number
  currentBid: number
  isEncrypted: boolean
}

interface HomeFeedProps {
  onCompose: () => void
}

const SAMPLE_SUITS: Suit[] = [
  {
    id: '1',
    author: 'Sui Foundation',
    handle: 'suifoundation',
    avatar: 'S',
    content: 'Introducing Suiter - a production-ready decentralized social network built on Sui blockchain. Every post is an NFT with dynamic value.',
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    likes: 1243,
    replies: 342,
    reposts: 856,
    liked: false,
    isNFT: true,
    nftValue: 0.5,
    currentBid: 0.75,
    isEncrypted: true,
  },
  {
    id: '2',
    author: 'Developer Insights',
    handle: 'devinsights',
    avatar: 'D',
    content: 'Building on Sui with React and TypeScript. The performance is incredible. Transactions finalize in milliseconds.',
    timestamp: Date.now() - 4 * 60 * 60 * 1000,
    likes: 892,
    replies: 156,
    reposts: 423,
    liked: false,
    isNFT: true,
    nftValue: 0.3,
    currentBid: 0.4,
    isEncrypted: false,
  },
  {
    id: '3',
    author: 'Web3 Daily',
    handle: 'web3daily',
    avatar: 'W',
    content: 'Monochrome elegance meets decentralization. No distractions, just pure connection on the blockchain.',
    timestamp: Date.now() - 6 * 60 * 60 * 1000,
    likes: 2156,
    replies: 678,
    reposts: 1245,
    liked: false,
    isNFT: true,
    nftValue: 0.8,
    currentBid: 1.2,
    isEncrypted: true,
  },
]

export function HomeFeed({ onCompose }: HomeFeedProps) {
  const { address } = useSui()
  const [suits, setSuits] = useState<Suit[]>(SAMPLE_SUITS)
  const [tab, setTab] = useState<'foryou' | 'following' | 'feed'>('foryou')
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())

  const toggleLike = (id: string) => {
    setSuits(suits.map(suit =>
      suit.id === id
        ? { ...suit, liked: !suit.liked, likes: suit.liked ? suit.likes - 1 : suit.likes + 1 }
        : suit
    ))
  }

  const toggleBookmark = (id: string, isBookmarked: boolean) => {
    const newBookmarks = new Set(bookmarks)
    if (isBookmarked) {
      newBookmarks.add(id)
    } else {
      newBookmarks.delete(id)
    }
    setBookmarks(newBookmarks)
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="sticky top-0 bg-background/80 backdrop-blur border-b border-border z-10">
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab('foryou')}
            className={`flex-1 px-4 py-4 font-semibold text-sm transition-colors relative hover:bg-muted/50 ${
              tab === 'foryou' 
                ? 'text-foreground' 
                : 'text-muted-foreground'
            }`}
          >
            For You
            {tab === 'foryou' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t" />
            )}
          </button>
          <button
            onClick={() => setTab('following')}
            disabled={!address}
            className={`flex-1 px-4 py-4 font-semibold text-sm transition-colors relative hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed ${
              tab === 'following' 
                ? 'text-foreground' 
                : 'text-muted-foreground'
            }`}
          >
            Following
            {tab === 'following' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t" />
            )}
          </button>
          <button
            onClick={() => setTab('feed')}
            className={`flex-1 px-4 py-4 font-semibold text-sm transition-colors relative hover:bg-muted/50 ${
              tab === 'feed'
                ? 'text-foreground' 
                : 'text-muted-foreground'
            }`}
          >
            Feed
            {tab === 'feed' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t" />
            )}
          </button>
        </div>
      </div>

      {/* Compose Section */}
      {address && tab !== 'feed' && (
        <div className="border-b border-border p-4">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-sm font-mono font-bold shrink-0">
              {address.slice(-4).toUpperCase()}
            </div>
            <div className="flex-1">
              <button
                onClick={onCompose}
                className="w-full text-left text-lg text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/30"
              >
                What's happening!?
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conditional Content Based on Tab */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'feed' ? (
          <FeedVertical />
        ) : (
          <>
            {suits.map((suit) => (
              <SuitCard
                key={suit.id}
                {...suit}
                onLike={toggleLike}
                onBookmark={toggleBookmark}
                bookmarked={bookmarks.has(suit.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

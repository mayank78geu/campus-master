import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import api, { API_ORIGIN } from '../services/api';
import { 
  Send, Trash2, MessageSquare, Shield, AlertCircle
} from 'lucide-react';

export default function BatchChatWindow({
  _courseId,
  batches = [],
  selectedBatch,
  onSelectBatch,
  isFaculty,
  user,
  courseCode = 'COURSE'
}) {
  const [activeBatchId, setActiveBatchId] = useState(
    selectedBatch?.id || (batches.length > 0 ? batches[0].id : null)
  );
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const messagesEndRef = useRef(null);
  const stompClientRef = useRef(null);

  useEffect(() => {
    if (selectedBatch?.id && selectedBatch.id !== activeBatchId) {
      setActiveBatchId(selectedBatch.id);
    } else if (!activeBatchId && batches.length > 0) {
      setActiveBatchId(batches[0].id);
    }
  }, [selectedBatch, batches]);

  // Scroll to bottom smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch chat history from REST endpoint
  const fetchHistory = async (batchId) => {
    if (!batchId) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/batches/${batchId}/chat/messages`);
      setMessages(res.data || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setError(err.message || 'Failed to load messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Connect WebSocket & Subscribe to Batch Channel
  useEffect(() => {
    if (!activeBatchId) return;

    fetchHistory(activeBatchId);

    const token = localStorage.getItem('cm_token');
    const wsUrl = `${API_ORIGIN.replace(/^http/, 'ws')}/ws-chat`;

    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 4000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setWsConnected(true);
        // Subscribe to batch specific topic
        client.subscribe(`/topic/batch/${activeBatchId}`, (message) => {
          try {
            const incoming = JSON.parse(message.body);
            setMessages((prev) => {
              const existingIdx = prev.findIndex((m) => m.id === incoming.id);
              if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx] = {
                  ...incoming,
                  isSelf: incoming.senderId === user?.id,
                };
                return updated;
              }
              return [
                ...prev,
                {
                  ...incoming,
                  isSelf: incoming.senderId === user?.id,
                },
              ];
            });
          } catch (e) {
            console.error('Failed to parse incoming WebSocket message:', e);
          }
        });
      },
      onDisconnect: () => {
        setWsConnected(false);
      },
      onStompError: (frame) => {
        console.warn('STOMP protocol error:', frame.headers['message']);
        setWsConnected(false);
      },
      onWebSocketClose: () => {
        setWsConnected(false);
      },
    });

    try {
      client.activate();
      stompClientRef.current = client;
    } catch (err) {
      console.error('Error activating STOMP client:', err);
    }

    return () => {
      if (stompClientRef.current) {
        try {
          stompClientRef.current.deactivate();
        } catch (_e) {
          // ignore cleanup errors
        }
      }
    };
  }, [activeBatchId, user?.id]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !activeBatchId || sending) return;

    setSending(true);
    setError('');
    try {
      // Send via REST endpoint for guaranteed consistency; WebSocket broker broadcasts to all subscribers
      const res = await api.post(`/batches/${activeBatchId}/chat/messages`, {
        content: text,
      });

      setInputText('');

      // Add to local state optimistically if not already broadcasted
      const savedMsg = res.data;
      if (savedMsg) {
        setMessages((prev) => {
          if (!prev.some((m) => m.id === savedMsg.id)) {
            return [...prev, { ...savedMsg, isSelf: true }];
          }
          return prev;
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message for everyone in the batch?')) {
      return;
    }

    setDeletingId(messageId);
    try {
      const res = await api.delete(`/batches/${activeBatchId}/chat/messages/${messageId}`);
      const updated = res.data;
      if (updated) {
        setMessages((prev) =>
          prev.map((m) => (m.id === updated.id ? { ...updated, isSelf: m.isSelf } : m))
        );
      }
    } catch (err) {
      alert(err.message || 'Failed to delete message');
    } finally {
      setDeletingId(null);
    }
  };

  const currentBatch = batches.find((b) => b.id === Number(activeBatchId)) || batches[0];
  const batchName = currentBatch?.term || currentBatch?.name || 'Selected Batch';

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_e) {
      return '';
    }
  };

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '20px',
      border: '1px solid #E2E8F0',
      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '750px',
      maxHeight: 'calc(100vh - 220px)',
    }}>
      {/* Top Header */}
      <div style={{
        padding: '1.15rem 1.6rem',
        borderBottom: '1px solid #E2E8F0',
        backgroundColor: '#FAFAFA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: '#E6F7F3',
            color: '#0D9488',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <MessageSquare size={20} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {courseCode} · {batchName} Discussion
              </h2>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.15rem 0.55rem',
                borderRadius: '999px',
                backgroundColor: wsConnected ? '#D1FAE5' : '#FEF3C7',
                color: wsConnected ? '#065F46' : '#B45309',
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: wsConnected ? '#10B981' : '#F59E0B',
                }} />
                {wsConnected ? 'Connected (Live)' : 'Reconnecting...'}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0.2rem 0 0' }}>
              Private batch channel · Exclusive to {currentBatch?.enrolledStudentsCount ?? currentBatch?.enrolledCount ?? 0} enrolled students and course faculty
            </p>
          </div>
        </div>

        {/* Batch Selector if user is faculty or multiple batches exist */}
        {isFaculty && batches.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>
              Switch batch:
            </span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {batches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setActiveBatchId(b.id);
                    if (onSelectBatch) onSelectBatch(b);
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: b.id === Number(activeBatchId) ? '#0D9488' : '#CBD5E1',
                    backgroundColor: b.id === Number(activeBatchId) ? '#0D9488' : '#FFFFFF',
                    color: b.id === Number(activeBatchId) ? '#FFFFFF' : '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {b.term || b.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error alert banner */}
      {error && (
        <div style={{
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          padding: '0.65rem 1.25rem',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          borderBottom: '1px solid #FECACA',
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Message Stream Area */}
      <div style={{
        flex: 1,
        padding: '1.4rem 1.75rem',
        overflowY: 'auto',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#64748B',
            fontSize: '0.88rem',
          }}>
            Loading batch conversations...
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            maxWidth: '420px',
            padding: '2rem 1rem',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#E0F2FE',
              color: '#0284C7',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <MessageSquare size={26} />
            </div>
            <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>
              No messages in this batch yet
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
              Start the discussion! Ask questions about lectures, coordinate study groups, or share insights with your batchmates.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.isSelf || (user && msg.senderId === user.id);
            const isFacultySender = msg.senderRole === 'FACULTY';
            const canDelete = !msg.isDeleted && (isOwn || isFaculty);

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isOwn ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  alignSelf: isOwn ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Sender metadata row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  marginBottom: '0.25rem',
                  fontSize: '0.75rem',
                  color: '#64748B',
                  padding: '0 0.35rem',
                }}>
                  <span style={{ fontWeight: 700, color: isOwn ? '#0D9488' : '#1E293B' }}>
                    {isOwn ? 'You' : msg.senderName}
                  </span>

                  {isFacultySender && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}>
                      <Shield size={10} />
                      Faculty
                    </span>
                  )}

                  <span>·</span>
                  <span>{formatMessageTime(msg.createdAt)}</span>
                </div>

                {/* Message Bubble */}
                <div
                  style={{
                    position: 'relative',
                    borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    padding: '0.85rem 1.15rem',
                    backgroundColor: msg.isDeleted
                      ? '#F1F5F9'
                      : isOwn
                      ? '#0D9488'
                      : '#FFFFFF',
                    color: msg.isDeleted
                      ? '#64748B'
                      : isOwn
                      ? '#FFFFFF'
                      : '#0F172A',
                    border: msg.isDeleted
                      ? '1px dashed #CBD5E1'
                      : isOwn
                      ? 'none'
                      : '1px solid #E2E8F0',
                    boxShadow: msg.isDeleted ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.isDeleted ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontStyle: 'italic',
                      color: '#64748B',
                    }}>
                      <Trash2 size={14} color="#94A3B8" />
                      <span>This message was deleted</span>
                    </div>
                  ) : (
                    <div>{msg.content}</div>
                  )}

                  {/* Delete for everyone action button */}
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      disabled={deletingId === msg.id}
                      title="Delete for everyone"
                      style={{
                        marginTop: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: 'transparent',
                        border: 'none',
                        color: isOwn ? 'rgba(255,255,255,0.75)' : '#94A3B8',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'color 0.15s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.color = isOwn ? '#FEE2E2' : '#DC2626';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.color = isOwn ? 'rgba(255,255,255,0.75)' : '#94A3B8';
                      }}
                    >
                      <Trash2 size={12} />
                      <span>{deletingId === msg.id ? 'Deleting...' : 'Delete for everyone'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bar */}
      <form
        onSubmit={handleSendMessage}
        style={{
          padding: '1rem 1.4rem',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Message ${batchName}... (Press Enter to send)`}
          disabled={!activeBatchId || sending}
          style={{
            flex: 1,
            padding: '0.75rem 1.15rem',
            borderRadius: '12px',
            border: '1px solid #CBD5E1',
            outline: 'none',
            fontSize: '0.88rem',
            backgroundColor: '#F8FAFC',
            color: '#0F172A',
            transition: 'border-color 0.15s ease',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#0D9488'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
        />

        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          style={{
            backgroundColor: inputText.trim() && !sending ? '#0D9488' : '#94A3B8',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            padding: '0.75rem 1.4rem',
            fontWeight: 700,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            cursor: inputText.trim() && !sending ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
            boxShadow: inputText.trim() && !sending ? '0 2px 6px rgba(13, 148, 136, 0.25)' : 'none',
          }}
        >
          <Send size={15} />
          <span>{sending ? 'Sending...' : 'Send'}</span>
        </button>
      </form>
    </div>
  );
}

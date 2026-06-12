import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import API from '../services/api';

const ExpenseDetailsDrawer = ({ expenseId, groupId, members, onClose, onExpenseDeleted }) => {
  const { user } = useContext(AuthContext);
  const socket = useSocket();

  const [expense, setExpense] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [typingUser, setTypingUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const commentEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch expense details & comments
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/api/expenses/${expenseId}`);
        if (res.data.success) {
          setExpense(res.data.data);
        }

        const commentsRes = await API.get(`/api/comments/expense/${expenseId}`);
        if (commentsRes.data.success) {
          setComments(commentsRes.data.data);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load expense details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [expenseId]);

  // Set up socket listeners
  useEffect(() => {
    if (!socket || !expenseId) return;

    // Join room
    socket.emit('join_expense', expenseId);

    // Listen for comments
    socket.on('receive_comment', (comment) => {
      setComments((prev) => [...prev, comment]);
    });

    // Listen for typing indicators
    socket.on('typing', ({ userName }) => {
      setTypingUser(userName);
    });

    socket.on('stop_typing', () => {
      setTypingUser('');
    });

    return () => {
      // Leave room on unmount
      socket.emit('leave_expense', expenseId);
      socket.off('receive_comment');
      socket.off('typing');
      socket.off('stop_typing');
    };
  }, [socket, expenseId]);

  // Scroll to bottom of comments list on new comment
  useEffect(() => {
    commentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments, typingUser]);

  // Handle key press / input for typing indicators
  const handleCommentChange = (e) => {
    setNewComment(e.target.value);

    if (!socket || !user) return;

    // Emit typing status
    socket.emit('typing', { expenseId, userName: user.name });

    // Clear previous timeout and set a new one to stop typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { expenseId });
    }, 1500);
  };

  // Submit comment
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      // Send comment via REST API (which automatically triggers socket emit on backend)
      await API.post(`/api/comments/expense/${expenseId}`, {
        message: newComment,
      });

      // Clear local input and stop typing indicator
      setNewComment('');
      if (socket) {
        socket.emit('stop_typing', { expenseId });
      }
    } catch (err) {
      console.error('Failed to post comment', err);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async () => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    try {
      const res = await API.delete(`/api/expenses/${expenseId}`);
      if (res.data.success) {
        onExpenseDeleted();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to delete expense');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-brand-charcoal-medium border-l border-brand-charcoal-light p-6 shadow-2xl flex items-center justify-center">
        <span className="text-gray-400 uppercase tracking-widest font-bold text-xs">Loading Expense Details...</span>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-brand-charcoal-medium border-l border-brand-charcoal-light p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-900 text-lg">Error</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white uppercase font-bold text-xs">Close</button>
        </div>
        <div className="bg-brand-red/10 border border-brand-red text-brand-red p-3 text-sm">{error || 'Expense not found'}</div>
      </div>
    );
  }

  // Permissions: expense creator or group admin (creator of the group)
  const isExpenseCreator = expense.createdBy?._id === user?._id;
  const isGroupAdmin = members.some((m) => m.userId._id === user?._id && m.role === 'creator');
  const canDelete = isExpenseCreator || isGroupAdmin;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-brand-charcoal-medium border-l border-brand-charcoal-light shadow-2xl flex flex-col">
      {/* Drawer Header */}
      <div className="p-6 border-b border-brand-charcoal-light flex justify-between items-center">
        <div>
          <span className="text-xs uppercase bg-brand-charcoal-dark border border-brand-charcoal-light text-gray-400 px-2 py-0.5 font-bold">
            Expense Detail
          </span>
          <h3 className="font-black text-xl text-gray-900 uppercase tracking-wide mt-1.5">{expense.description}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-xs uppercase font-bold text-gray-400 hover:text-brand-orange border border-brand-charcoal-light hover:border-brand-orange px-3 py-1.5 transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>

      {/* Drawer Body (Scrollable info) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Cost info card */}
        <div className="bg-brand-charcoal-dark border border-brand-charcoal-light p-5 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-400">Total amount</p>
            <p className="text-2xl font-black text-brand-orange">₹{expense.amount.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Paid by</p>
            <p className="text-sm font-bold text-gray-800">{expense.paidBy?.name}</p>
          </div>
        </div>

        {/* Splits breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-brand-charcoal-light pb-1">
            Split Breakdown ({expense.splitType})
          </h4>
          <div className="divide-y divide-brand-charcoal-light border border-brand-charcoal-light bg-brand-charcoal-dark">
            {expense.splits.map((s, index) => (
              <div key={index} className="p-3 flex justify-between items-center text-xs">
                <span className="text-gray-750 font-semibold">{s.user?.name}</span>
                <span className="font-bold text-gray-800">₹{s.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Panel */}
        {canDelete && (
          <div className="pt-2">
            <button
              onClick={handleDeleteExpense}
              className="w-full bg-brand-red/10 border border-brand-red/50 hover:bg-brand-red hover:text-white text-brand-red font-bold uppercase py-2.5 text-xs tracking-wider transition-colors cursor-pointer"
            >
              Delete Expense
            </button>
          </div>
        )}

        {/* Comments Section */}
        <div className="space-y-4 pt-4 border-t border-brand-charcoal-light flex flex-col h-[350px]">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-brand-charcoal-light pb-1">
            Activity Chat
          </h4>

          {/* Messages list */}
          <div className="flex-1 bg-brand-charcoal-dark border border-brand-charcoal-light overflow-y-auto p-4 space-y-3 text-xs">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No comments yet. Start the conversation!</p>
            ) : (
              comments.map((c) => (
                <div key={c._id} className="space-y-0.5">
                  <div className="flex justify-between items-center text-[10px] text-gray-400">
                    <strong className="text-brand-orange">{c.userId?.name}</strong>
                    <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-gray-800 bg-brand-charcoal-medium p-2.5 border-l-2 border-brand-orange">{c.message}</p>
                </div>
              ))
            )}
            
            {/* Typing Indicator */}
            {typingUser && (
              <div className="text-[10px] text-gray-500 italic">
                {typingUser} is typing...
              </div>
            )}
            
            <div ref={commentEndRef} />
          </div>

          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="flex gap-2">
            <input
              type="text"
              required
              value={newComment}
              onChange={handleCommentChange}
              className="flex-1 bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-gray-800 text-xs px-3 py-2.5 outline-none"
              placeholder="Write a comment..."
            />
            <button
              type="submit"
              className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold uppercase px-4 py-2 text-xs tracking-wider transition-colors cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetailsDrawer;

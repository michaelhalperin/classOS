import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, useReducedMotion } from 'motion/react';
import PageLayout from '../../components/layout/PageLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getLesson } from '../../api/lessons.js';
import {
  getQuestions,
  createQuestion,
  pinQuestion,
  deleteQuestion,
  getAnswers,
  createAnswer,
  deleteAnswer,
} from '../../api/qna.js';

const spring = { type: 'spring', stiffness: 100, damping: 20 };

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const blockVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: spring },
};

const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: spring },
};

export default function QnA() {
  const shouldReduce = useReducedMotion();
  const { lessonId } = useParams();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const [expandedId, setExpandedId] = useState(null);

  const { data: lesson } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => getLesson(lessonId),
    enabled: Boolean(lessonId),
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['questions', lessonId],
    queryFn: () => getQuestions(lessonId),
    enabled: Boolean(lessonId),
  });

  return (
    <PageLayout>
      <motion.div
        className="max-w-3xl mx-auto"
        variants={shouldReduce ? undefined : sectionVariants}
        initial={shouldReduce ? false : 'hidden'}
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={shouldReduce ? undefined : blockVariants} className="mb-6">
          {lessonId && (
            <Link
              to={isTeacher ? `/teacher/lessons/${lessonId}` : `/student/lessons/${lessonId}`}
              className="text-sm text-brand-600 hover:underline"
            >
              ← Back to Lesson
            </Link>
          )}
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Q&A {lesson ? `— ${lesson.title}` : ''}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {questions.length} question{questions.length !== 1 ? 's' : ''}
          </p>
        </motion.div>

        {/* Ask a question */}
        <motion.div variants={shouldReduce ? undefined : blockVariants}>
          <AskForm lessonId={lessonId} />
        </motion.div>

        {/* Questions list */}
        <motion.div variants={shouldReduce ? undefined : blockVariants} className="mt-6">
          {isLoading ? (
            <LoadingSkeleton />
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">💬</p>
              <p>No questions yet. Be the first to ask!</p>
            </div>
          ) : (
            <motion.div
              variants={shouldReduce ? undefined : listVariants}
              initial={shouldReduce ? false : 'hidden'}
              animate="visible"
              className="space-y-4"
            >
              {questions.map((q) => (
                <motion.div key={q._id} variants={shouldReduce ? undefined : cardVariants}>
                  <QuestionCard
                    question={q}
                    isTeacher={isTeacher}
                    userId={user?.id}
                    expanded={expandedId === q._id}
                    onToggle={() => setExpandedId(expandedId === q._id ? null : q._id)}
                    onExpand={() => setExpandedId(q._id)}
                    onCollapseThread={() => setExpandedId(null)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </PageLayout>
  );
}

function AskForm({ lessonId }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (data) => createQuestion({ lessonId, ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions', lessonId] });
      reset();
    },
  });

  return (
    <div className="card">
      <h2 className="font-semibold text-gray-800 mb-3">Ask a Question</h2>
      <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-3">
        <div>
          <input
            {...register('title', { required: 'Title required' })}
            className="input"
            placeholder="Short question title…"
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>
        <div>
          <textarea
            {...register('body', { required: 'Details required' })}
            rows={3}
            className="input resize-none"
            placeholder="Describe your question in detail…"
          />
          {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body.message}</p>}
        </div>
        {mutation.isError && (
          <p className="text-sm text-red-600">{mutation.error?.response?.data?.message}</p>
        )}
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Posting…' : 'Post Question'}
        </button>
      </form>
    </div>
  );
}

function QuestionCard({ question, isTeacher, userId, expanded, onToggle, onExpand, onCollapseThread }) {
  const qc = useQueryClient();

  const { data: answers = [] } = useQuery({
    queryKey: ['answers', question._id],
    queryFn: () => getAnswers(question._id),
    enabled: Boolean(question._id),
    staleTime: 30_000,
  });

  const pinMutation = useMutation({
    mutationFn: () => pinQuestion(question._id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', question.lessonId] }),
  });

  const deleteQMutation = useMutation({
    mutationFn: () => deleteQuestion(question._id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', question.lessonId] }),
  });

  const isOwnQuestion = userId === (question.authorId?._id || question.authorId);

  return (
    <div className={`card transition-all ${question.isPinned ? 'border-brand-200 bg-brand-50/30' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-start gap-2 flex-wrap">
            {question.isPinned && (
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">📌 Pinned</span>
            )}
            <button
              onClick={onToggle}
              className="font-semibold text-gray-900 hover:text-brand-600 transition-colors text-left"
            >
              {question.title}
            </button>
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            <span className={`font-medium ${question.authorId?.role === 'teacher' ? 'text-brand-600' : 'text-gray-600'}`}>
              {question.authorId?.name}
              {question.authorId?.role === 'teacher' && ' (Teacher)'}
            </span>
            <span>·</span>
            <span>{new Date(question.createdAt).toLocaleDateString()}</span>
            <span>·</span>
            <button onClick={onToggle} className="hover:text-brand-600 transition-colors">
              {answers.length || '0'} answers
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isTeacher && (
            <button
              type="button"
              onClick={() => (expanded ? onToggle() : onExpand())}
              className={`text-xs px-2 py-1 rounded transition-colors font-medium ${
                expanded
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}
              title={expanded ? 'Close thread' : 'Reply to this question'}
            >
              {expanded ? 'Close' : 'Reply'}
            </button>
          )}
          {isTeacher && (
            <button
              onClick={() => pinMutation.mutate()}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                question.isPinned
                  ? 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title={question.isPinned ? 'Unpin' : 'Pin'}
            >
              📌
            </button>
          )}
          {(isTeacher || isOwnQuestion) && (
            <button
              onClick={() => deleteQMutation.mutate()}
              className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
              title="Delete"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Expanded: body + answers */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-gray-700 text-sm whitespace-pre-wrap mb-5">{question.body}</p>

          {/* Answers */}
          <div className="space-y-3">
            {answers.map((a) => (
              <AnswerItem
                key={a._id}
                answer={a}
                isTeacher={isTeacher}
                userId={userId}
                questionId={question._id}
              />
            ))}
          </div>

          <AnswerForm
            questionId={question._id}
            isTeacher={isTeacher}
            onPosted={isTeacher ? onCollapseThread : undefined}
          />
        </div>
      )}
    </div>
  );
}

function AnswerItem({ answer, isTeacher, userId, questionId }) {
  const qc = useQueryClient();
  const isOwn = userId === (answer.authorId?._id || answer.authorId);

  const deleteMutation = useMutation({
    mutationFn: () => deleteAnswer(answer._id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['answers', questionId] }),
  });

  return (
    <div className={`p-3 rounded-lg ${answer.authorId?.role === 'teacher' ? 'bg-brand-50 border border-brand-100' : 'bg-gray-50'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{answer.body}</p>
          <p className="text-xs text-gray-400 mt-1">
            <span className={`font-medium ${answer.authorId?.role === 'teacher' ? 'text-brand-600' : 'text-gray-500'}`}>
              {answer.authorId?.name}
              {answer.authorId?.role === 'teacher' && ' ⭐'}
            </span>
            {' · '}
            {new Date(answer.createdAt).toLocaleDateString()}
          </p>
        </div>
        {(isTeacher || isOwn) && (
          <button
            onClick={() => deleteMutation.mutate()}
            className="text-xs text-gray-300 hover:text-red-500 transition-colors shrink-0"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function AnswerForm({ questionId, isTeacher, onPosted }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (data) => createAnswer({ questionId, ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['answers', questionId] });
      reset();
      onPosted?.();
    },
  });

  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="mt-4 flex flex-col gap-2">
      {isTeacher && (
        <p className="text-xs font-medium text-brand-700">Your reply to the student</p>
      )}
      <div className="flex gap-2">
        <div className="flex-1">
          <textarea
            {...register('body', { required: true })}
            rows={2}
            className="input resize-none text-sm"
            placeholder={isTeacher ? 'Write your response…' : 'Write your answer…'}
          />
          {errors.body && <p className="mt-1 text-xs text-red-600">Enter a reply</p>}
        </div>
        <button type="submit" className="btn-primary self-end py-2" disabled={mutation.isPending}>
          {mutation.isPending ? '…' : isTeacher ? 'Send' : 'Post'}
        </button>
      </div>
    </form>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="card animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}

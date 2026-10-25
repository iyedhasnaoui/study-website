// src/features/zitouna/hooks/useFaqMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFaq, updateFaq, deleteFaq } from '../api';
import type { FaqEntry } from '../types';

export const useFaqMutations = () => {
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        // FIX: Explicitly define the payload types expected by the backend
        mutationFn: (data: { question: string; answer: string; published: boolean; tagIds?: number[] }) => createFaq(data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['faqs'] });
        },
    });

    const updateMutation = useMutation({
        // Changed id type from string to number
        mutationFn: ({ id, data }: { id: number; data: Partial<FaqEntry> }) => updateFaq(id, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: ['faqs'] });
            const previousFaqs = queryClient.getQueryData<FaqEntry[]>(['faqs']);

            queryClient.setQueryData<FaqEntry[]>(['faqs'], (old) =>
                old?.map(faq => (faq.id === id ? { ...faq, ...data } : faq))
            );
            return { previousFaqs };
        },
        // Added underscores to intentionally unused variables
        onError: (_err, _variables, context) => {
            if (context?.previousFaqs) {
                queryClient.setQueryData(['faqs'], context.previousFaqs);
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: ['faqs'] });
        },
    });

    const deleteMutation = useMutation({
        // Changed id type from string to number
        mutationFn: (id: number) => deleteFaq(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['faqs'] });
            const previousFaqs = queryClient.getQueryData<FaqEntry[]>(['faqs']);

            queryClient.setQueryData<FaqEntry[]>(['faqs'], (old) =>
                old?.filter(f => f.id !== id)
            );
            return { previousFaqs };
        },
        // Added underscores to intentionally unused variables
        onError: (_err, _id, context) => {
            if (context?.previousFaqs) {
                queryClient.setQueryData(['faqs'], context.previousFaqs);
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: ['faqs'] });
        }
    });

    return { createMutation, updateMutation, deleteMutation };
};
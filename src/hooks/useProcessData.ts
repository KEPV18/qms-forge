/**
 * React Query hook for Process Interaction data
 * 
 * Provides data fetching, caching, and mutation capabilities
 * for the Process Interaction Sheet module.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  getAllProcesses,
  addProcess,
  updateProcess,
  calculateProcessStats,
  getProcessFlow,
  type ProcessInteraction,
  type ProcessInput,
  type ProcessUpdate,
} from "@/lib/processInteractionService";

const QUERY_KEY = ["processes"];

/**
 * Hook for fetching and managing Process Interaction data
 */
export function useProcessData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all processes
  const {
    data: processes = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getAllProcesses,
    staleTime: 60000, // 1 minute (processes change less frequently)
    refetchOnWindowFocus: true,
  });

  // Add new process mutation
  const addProcessMutation = useMutation({
    mutationFn: (input: ProcessInput) => addProcess(input),
    onSuccess: (newProcess) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: "Process Added",
        description: `Process "${newProcess.processName}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Process",
        description: error.message.includes("API key")
          ? "Write operations require OAuth authentication. Current API key is read-only."
          : error.message,
        variant: "destructive",
      });
    },
  });

  // Update process mutation
  const updateProcessMutation = useMutation({
    mutationFn: ({ processName, updates }: { processName: string; updates: ProcessUpdate }) =>
      updateProcess(processName, updates),
    onSuccess: (updatedProcess) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: "Process Updated",
        description: `Process "${updatedProcess.processName}" has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Process",
        description: error.message.includes("API key")
          ? "Write operations require OAuth authentication. Current API key is read-only."
          : error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate statistics
  const stats = calculateProcessStats(processes);
  const processFlow = getProcessFlow(processes);

  return {
    processes,
    stats,
    processFlow,
    isLoading,
    isError,
    error,
    refetch,
    addProcess: addProcessMutation.mutate,
    updateProcess: updateProcessMutation.mutate,
    isAdding: addProcessMutation.isPending,
    isUpdating: updateProcessMutation.isPending,
  };
}

/**
 * Hook for fetching a single process by name
 */
export function useProcess(processName: string) {
  const { processes, isLoading, isError } = useProcessData();
  const process = processes.find((p) => p.processName === processName);

  return {
    process,
    isLoading,
    isError,
    notFound: !isLoading && !process,
  };
}

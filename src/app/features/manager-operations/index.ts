import './styles/manager-operations.css';

export { ManagerOperationsOverview } from './components/ManagerOperationsOverview';
export {
  ManagerOperationsWorkspace,
  type ManagerOperationsView,
} from './components/ManagerOperationsWorkspace';
export type { ManagerOperationsSectionId } from './components/ManagerOperationsCockpit';
export { ManagerSuggestionInbox } from './components/ManagerSuggestionInbox';
export { ManagerTodoBoard } from './components/ManagerTodoBoard';
export { useManagerOperations } from './hooks/useManagerOperations';
export { useManagerSuggestions } from './hooks/useManagerSuggestions';
export { useManagerTodos } from './hooks/useManagerTodos';

import { ApiClient } from '@/lib/api'

export interface Department {
  name: string
  users: {
    id: string
    name: string
    job_title?: string
  }[]
  userCount: number
}

export interface DepartmentUser {
  id: string
  name: string
  job_title?: string
}

export class DepartmentService {
  /**
   * Get all departments with their users
   */
  static async getDepartments(): Promise<Department[]> {
    const response = await ApiClient.invokeEdgeFunction('department-management', {
      body: { action: 'get_departments' },
      method: 'POST'
    }) as { data?: Department[] }
    return response.data || []
  }

  /**
   * Assign a task to an entire department
   */
  static async assignTaskToDepartment(taskId: string, departmentName: string) {
    return ApiClient.invokeEdgeFunction('department-management', {
      body: { 
        action: 'assign_to_department', 
        task_id: taskId, 
        department_name: departmentName 
      },
      method: 'POST'
    })
  }

  /**
   * Get users in a specific department
   */
  static getUsersInDepartment(departments: Department[], departmentName: string): DepartmentUser[] {
    const department = departments.find(dept => dept.name === departmentName)
    return department ? department.users : []
  }

  /**
   * Get all unique department names
   */
  static getDepartmentNames(departments: Department[]): string[] {
    return departments.map(dept => dept.name).sort()
  }
}

export default DepartmentService
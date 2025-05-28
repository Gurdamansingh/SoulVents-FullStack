import React, { useState, useEffect } from 'react';
import { Users, UserCheck, Shield, BookOpen, X } from 'lucide-react';
import { useCallback } from 'react';
import AnalyticsDashboard from '../../components/admin/AnalyticsDashboard';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import UserForm from '../../components/admin/UserForm';
import ConsultantForm from '../../components/admin/ConsultantForm';
import ProfessionalForm from '../../components/admin/ProfessionalForm';
import type { Expert, User } from '../../types';
import type { AnalyticsData } from '../../types/analytics';
import { useNavigate } from 'react-router-dom';

interface BlogPost {
  id: string;
  title: string;
  excerpt?: string;
  content: string;
  featured_image?: string;
  status: 'DRAFT' | 'PUBLISHED';
  author_name: string;
  created_at: string;
  views: number;
  categories?: string[];
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
  read_time?: number;
}

const isBlogPost = (item: User | Expert | BlogPost | null): item is BlogPost => {
  return !!item && 'title' in item;
};

const Dashboard = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [consultants, setConsultants] = useState<Expert[]>([]);
  const [professionals, setProfessionals] = useState<Expert[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showConsultantForm, setShowConsultantForm] = useState(false);
  const [showProfessionalForm, setShowProfessionalForm] = useState(false);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<User | Expert | BlogPost | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === 'users') {
        const data = await api.admin.getUsers(token);
        setUsers(data);
      } else if (activeTab === 'consultants' || activeTab === 'professionals') {
        const data = await api.admin.getExperts(token);
        setConsultants(data.consultants);
        setProfessionals(data.professionals);
      } else if (activeTab === 'blogs') {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/blogs/admin`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch blogs');
        const data = await response.json();
        setBlogs(data.posts);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [token, activeTab]);

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchData();
  }, [token, activeTab, fetchData]);

  const handleCreateUser = async (userData: any) => {
    try {
      await api.admin.createUser(userData, token);
      setShowUserForm(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(error.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (userData: any) => {
    if (!selectedItem) return;
    try {
      await api.admin.updateUser(selectedItem.id, userData, token);
      setShowUserForm(false);
      setSelectedItem(null);
      setIsEdit(false);
      fetchData();
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.admin.deleteUser(id, token);
        fetchData();
      } catch (error: any) {
        console.error('Error deleting user:', error);
        alert(error.message || 'Failed to delete user');
      }
    }
  };

  const handleCreateExpert = async (expertData: any, type: 'CONSULTANT' | 'PROFESSIONAL') => {
    try {
      setError(null);
      
      // Add password to form data
      // const formDataWithPassword = {
      //   ...expertData,
      //   type,
      //   password: expertData.password,
      // };

      console.log(`expertData:`, expertData);
      if (typeof expertData !== "object" || expertData === null) {
        console.error("Invalid expertData:", expertData);
        return;
      }      
      await api.admin.createExpert({ ...expertData, type }, token);
      setShowConsultantForm(false);
      setShowProfessionalForm(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating expert:', error);
      setError(error.message || 'Failed to create expert');
    }
  };

  const handleUpdateExpert = async (expertData: any) => {
    if (!selectedItem) return;
    try {
      // Include image URL if provided
      if (expertData.imageUrl) {
        expertData.image = expertData.imageUrl;
      }
      
      await api.admin.updateExpert(selectedItem.id, expertData, token);
      setShowConsultantForm(false);
      setShowProfessionalForm(false);
      setSelectedItem(null);
      setIsEdit(false);
      fetchData();
    } catch (error: any) {
      console.error('Error updating expert:', error);
      alert(error.message || 'Failed to update expert');
    }
  };

  const handleDeleteExpert = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this expert?')) {
      try {
        await api.admin.deleteExpert(id, token);
        fetchData();
      } catch (error: any) {
        console.error('Error deleting expert:', error);
        alert(error.message || 'Failed to delete expert');
      }
    }
  };

  const handleCreateBlog = async (blogData: any) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/blogs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(blogData)
      });

      if (!response.ok) {
        throw new Error('Failed to create blog post');
      }

      setShowBlogForm(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating blog post:', error);
      alert(error.message || 'Failed to create blog post');
    }
  };

  const handleUpdateBlog = async (blogData: any) => {
    if (!selectedItem) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/blogs/${selectedItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(blogData)
      });

      if (!response.ok) {
        throw new Error('Failed to update blog post');
      }

      setShowBlogForm(false);
      setSelectedItem(null);
      setIsEdit(false);
      fetchData();
    } catch (error: any) {
      console.error('Error updating blog post:', error);
      alert(error.message || 'Failed to update blog post');
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/blogs/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete blog post');
        }

        fetchData();
      } catch (error: any) {
        console.error('Error deleting blog post:', error);
        alert(error.message || 'Failed to delete blog post');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header with Logout */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <button
              onClick={() => {
                logout();
                navigate('/admin');
              }}
              className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Analytics Dashboard */}
        <div className="mb-12">
          {analyticsData && <AnalyticsDashboard data={analyticsData} isLoading={isLoadingAnalytics} />}
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Admin Header */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                className={`px-6 py-4 text-sm font-medium ${activeTab === 'users'
                  ? 'border-b-2 border-rose-500 text-rose-500'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
                onClick={() => setActiveTab('users')}
              >
                <Users className="inline-block h-5 w-5 mr-2" />
                Users
              </button>
              <button
                className={`px-6 py-4 text-sm font-medium ${activeTab === 'consultants'
                  ? 'border-b-2 border-rose-500 text-rose-500'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
                onClick={() => setActiveTab('consultants')}
              >
                <UserCheck className="inline-block h-5 w-5 mr-2" />
                Consultants
              </button>
              <button
                className={`px-6 py-4 text-sm font-medium ${activeTab === 'professionals'
                  ? 'border-b-2 border-rose-500 text-rose-500'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
                onClick={() => setActiveTab('professionals')}
              >
                <Shield className="inline-block h-5 w-5 mr-2" />
                Professionals
              </button>
              <button
                className={`px-6 py-4 text-sm font-medium ${activeTab === 'blogs'
                  ? 'border-b-2 border-rose-500 text-rose-500'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
                onClick={() => setActiveTab('blogs')}
              >
                <BookOpen className="inline-block h-5 w-5 mr-2" />
                Blogs
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            <div className="flex justify-between mb-6">
              <input
                type="text"
                placeholder="Search..."
                className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                onClick={() => {
                  setIsEdit(false);
                  setSelectedItem(null);
                  if (activeTab === 'users') setShowUserForm(true);
                  else if (activeTab === 'consultants') setShowConsultantForm(true);
                  else if (activeTab === 'professionals') setShowProfessionalForm(true);
                  else if (activeTab === 'blogs') setShowBlogForm(true);
                }}
                className="bg-rose-500 text-white px-4 py-2 rounded-md hover:bg-rose-600"
              >
                Add New
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {activeTab === 'blogs' ? (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Author
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Views
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {activeTab === 'users' ? 'Role' : 'Specialty'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeTab === 'blogs' && blogs.map((blog) => (
                    <tr key={blog.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{blog.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{blog.author_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${blog.status === 'PUBLISHED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {blog.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {blog.views}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => {
                            setSelectedItem(blog);
                            setIsEdit(true);
                            setShowBlogForm(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBlog(blog.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {activeTab === 'users' && users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => {
                            setSelectedItem(user);
                            setIsEdit(true);
                            setShowUserForm(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {activeTab === 'consultants' && consultants.map((consultant) => (
                    <tr key={consultant.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {consultant.user.fullName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{consultant.user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {consultant.specialty}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => {
                            setSelectedItem(consultant);
                            setIsEdit(true);
                            setShowConsultantForm(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteExpert(consultant.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {activeTab === 'professionals' && professionals.map((professional) => (
                    <tr key={professional.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {professional.user.fullName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{professional.user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          {professional.specialty}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => {
                            setSelectedItem(professional);
                            setIsEdit(true);
                            setShowProfessionalForm(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteExpert(professional.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Forms */}
      {showUserForm && (
        <UserForm
          onSubmit={isEdit ? handleUpdateUser : handleCreateUser}
          onClose={() => {
            setShowUserForm(false);
            setSelectedItem(null);
            setIsEdit(false);
          }}
          initialData={selectedItem}
          isEdit={isEdit}
        />
      )}

      {showConsultantForm && (
        <ConsultantForm
          onSubmit={(data) => handleCreateExpert(data, 'CONSULTANT')}
          onClose={() => {
            setShowConsultantForm(false);
            setSelectedItem(null);
            setIsEdit(false);
          }}
          initialData={selectedItem}
          isEdit={isEdit}
        />
      )}

      {showProfessionalForm && (
        <ProfessionalForm
          onSubmit={(data) => handleCreateExpert(data, 'PROFESSIONAL')}
          onClose={() => {
            setShowProfessionalForm(false);
            setSelectedItem(null);
            setIsEdit(false);
          }}
          initialData={selectedItem}
          isEdit={isEdit}
        />
      )}

      {/* Blog Form */}
      {showBlogForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {isEdit ? 'Edit Blog Post' : 'Create Blog Post'}
              </h2>
              <button
                onClick={() => {
                  setShowBlogForm(false);
                  setSelectedItem(null);
                  setIsEdit(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const blogData = {
                title: formData.get('title'),
                excerpt: formData.get('excerpt'),
                content: formData.get('content'),
                featuredImage: formData.get('featuredImage'),
                status: formData.get('status'),
                categories: formData.get('categories')?.toString().split(',').map(c => c.trim()),
                tags: formData.get('tags')?.toString().split(',').map(t => t.trim()),
                metaTitle: formData.get('metaTitle'),
                metaDescription: formData.get('metaDescription'),
                readTime: parseInt(formData.get('readTime')?.toString() || '0', 10)
              };

              if (isEdit) {
                handleUpdateBlog(blogData);
              } else {
                handleCreateBlog(blogData);
              }
            }} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  defaultValue={isBlogPost(selectedItem) ? selectedItem.title : ''}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Excerpt
                </label>
                <textarea
                  name="excerpt"
                  defaultValue={isBlogPost(selectedItem) ? selectedItem.excerpt : ''}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  name="content"
                  defaultValue={isBlogPost(selectedItem) ? (selectedItem.content || '') : ''}
                  rows={10}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Featured Image URL
                </label>
                <input
                  type="url"
                  name="featuredImage"
                  defaultValue={isBlogPost(selectedItem) ? (selectedItem.featured_image || '') : ''}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={isBlogPost(selectedItem) ? (selectedItem.status || 'DRAFT') : 'DRAFT'}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categories (comma-separated)
                </label>
                <input
                  type="text"
                  name="categories"
                  defaultValue={isBlogPost(selectedItem) ? (selectedItem.categories?.join(', ') || '') : ''}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  defaultValue={isBlogPost(selectedItem) ? (selectedItem.tags?.join(', ') || '') : ''}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Title
                </label>
                <input
                  type="text"
                  name="metaTitle"
                  defaultValue={isBlogPost(selectedItem) ? (selectedItem.meta_title || '') : ''}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Description
                </label>
                <textarea
                  name="metaDescription"
                  defaultValue={isBlogPost(selectedItem) ? (selectedItem.meta_description || '') : ''}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Read Time (minutes)
                </label>
                <input
                  type="number"
                  name="readTime"
                  defaultValue={isBlogPost(selectedItem) ? (selectedItem.read_time || '') : ''}
                  min="1"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBlogForm(false);
                    setSelectedItem(null);
                    setIsEdit(false);
                  }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600"
                >
                  {isEdit ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;